'use strict';

const {json, send} = require('micro');
const jsreport = require('jsreport-core')();
const cors = require('micro-cors')();
const _ = require('lodash');
const FileCleaner = require('cron-file-cleaner').FileCleaner;
const path = require('path');
const fs = require('fs');
const uuidv1 = require('uuid/v1');
const url = require('url');
const queryString = require('query-string');

const fileWatcher = new FileCleaner(
  path.join(__dirname, 'assets'),
  600000,
  '* */15 * * * *',
  {
    start: true
  });

const serveFile = async payload => {
  const { filename, res } = payload;
  fs.access(
    path.join(__dirname, 'assets/', `${filename}.pdf`),
    fs.constants.R_OK | fs.constants.W_OK, (err) => {
      if (err) return send(res, 404, 'Not Found');
      const fileStream = fs.createReadStream(
        path.join(__dirname, 'assets/', `${filename}.pdf`),
        { flags : 'r' }
      )
      fileStream.pipe(res);
  });
}

const htmlToPdf = ({ html, options, res }) => new Promise(function(resolve, reject) {
  const outputs = {
    'url': resp => {
      const filename = uuidv1();
      const fileStream = fs.createWriteStream(
        path.join(__dirname, 'assets/', `${filename}.pdf`),
        { flags : 'w' }
      );
      resp.stream.pipe(fileStream);
      resolve(filename);
    },
    stream: resp => resolve(resp.stream.pipe(res)),
    buffer: resp => resolve(resp.content.toString('base64')),
  };

  jsreport.init()
    .then(function () {
      return jsreport.render({
        template: {
          content: html,
          engine: 'jsrender',
          recipe: 'wkhtmltopdf',
          wkhtmltopdf: _.defaults({
"allowLocalFilesAccess": true
          }, options)
        },
        data: _.defaults({}, options.htmlData)
      }).then(function(resp) {
        if (outputs[options.output]) return outputs[options.output](resp);
        outputs.url(resp);
      });
    }).catch(function(e) {
      reject(e);
    })
});

const handler = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return {}
  }
  if (req.method === 'GET') {
    const { filename } = url.parse(req.url, true).query;
    if (!filename) return send(res, 404, 'Not Found');
    return serveFile({ filename: filename, res});
  }
	const body = await json(req);
  const {html, options} = body;


  // htmlToPdf({ html, options, res });
  return await htmlToPdf({ html, options});
};

module.exports = cors(handler);
