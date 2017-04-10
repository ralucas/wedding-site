const http = require('http');

const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const Router = require('router');

const port = process.env.PORT || 3000;
const sendgridApiKey = process.env.SENDGRID_API_KEY;

const helper = require('sendgrid').mail;
const from_email = new helper.Email('rsvp@richardandjill.com');
const to_email = new helper.Email('jilldaiss+weddingrsvp@gmail.com');
const subject = 'Wedding RSVP';
const sg = require('sendgrid')(sendgridApiKey);
// Serve up index.html
const serveIndex = serveStatic('./', {'index': ['index.html']});

const router = Router();

function bodyHandler(req, res, next) {
  function parse(str) {
    return str.split(/\=|\&/g)
      .reduce((acc, item, i) => {
        i % 2 ? acc[acc.length-1].push(item) : acc.push([item]);
        return acc;
      }, [])
      .reduce((acc, pair) => {
        if ( pair[1] ) {
          let key = encodeURIComponent(pair[0]);
          acc[pair[0]] = encodeURIComponent(pair[1]);
        }
        return acc;
      }, {});
  }
  function toEmail(str) {
    return str.split('&').map(line => {
      return line.split('=').map(item => {
        return encodeURIComponent(item).toUpperCase();
      }).join(" : ");
    }).join("\n");
  }
  return function(req, res, next) {
    let body = "";
    req.on('data', (data) => {
      body += data;
    })
    req.on('end', () => {
      req.body = parse(body);
      req.email = toEmail(body);
      return next();  
    });
  }
}

router.use(bodyHandler());

router.use('/', serveIndex);

router.post('/sendmail', (req, res) => {
  const content = new helper.Content('text/plain', req.email) 
  const mail = new helper.Mail(from_email, subject, to_email, content);
  const request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON(),
  });

  sg.API(request, function(error, response) {
    console.log(response.statusCode);
    console.log(response.body);
    console.log(response.headers);
    res.end('Done');
  });
});

function onRequest(req, res) {
  router(req, res, finalhandler(req, res));
}

// Create server
http.createServer(onRequest).listen(port, () => {
  console.log('Server listening on %s', port);
});

