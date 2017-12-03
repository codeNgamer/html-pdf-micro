'use strict';

const {json, send} = require('micro');
const jsreport = require('jsreport-core')();
const cors = require('micro-cors')();
const _ = require('lodash');
const path = require('path');
const uuidv1 = require('uuid/v1');
const url = require('url');
const aws = require('aws-sdk');
const s3 = new aws.S3();

const htmlToPdf = ({ html, options, res }) => new Promise(function(resolve, reject) {
  const outputs = {
    'url': resp => {
      const {
        fileName: s3Filename,
        accessKeyId,
        secretAccessKey,
        S3_BUCKET,
      } = options;

      process.env.AWS_ACCESS_KEY_ID = accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;

      const fileName = s3Filename || uuidv1();
       if (!S3_BUCKET) return resolve(send(res, 404, 'Invalid S3_BUCKET name'))

      const s3Params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Expires: 60,
        ContentType: 'application/pdf',
        Body: resp.content,
        ACL: 'public-read'
      };

      s3.upload(s3Params, function(err, data) {
        if (err) {
          return resolve(send(res, 404, error))
        }
        resolve(data);
      });
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
	const body = await json(req);
  const {html, options} = body;

  return await htmlToPdf({ html, options});
};

module.exports = cors(handler);
