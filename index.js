'use strict';

const {json} = require('micro');
const jsreport = require('jsreport-core')();

const htmlToPdf = ({ html, options, res }) => new Promise(function(resolve, reject) {
  // wkhtmltopdf(html, options, function (err, stream) {
  //   if (err) return reject(err);
  //   console.log(stream);
  //   return resolve(stream);
  // });
  jsreport.init()
    .then(function () {
      return jsreport.render({
        template: {
          content: html,
          engine: 'jsrender',
          recipe: 'wkhtmltopdf',
          wkhtmltopdf: options,
        },
        data: {
          foo: "world"
        }
      }).then(function(resp) {
        resolve(resp.stream);
      });
    }).catch(function(e) {
      reject(e);
    })
});

module.exports = async (req, res) => {
	const body = await json(req);
  const {html, options} = body;

  // htmlToPdf({ html, options, res });
  const stream = await htmlToPdf({ html, options});
  stream.pipe(res);
};
