const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "mautic.techresearchcenter.com",
  port: 587,
  secure: false, // correct for port 587
  auth: {
    user: "emailuser",
    pass: "Organics5!"
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.sendMail({
  from: '"Test" <emailuser@techresearchcenter.com>',
  to: 'aryan.motwani@techintelpro.com',
  subject: 'Hello ✔',
  text: 'Hello world?',
  html: '<b>Hello world?</b>',
}, (err, info) => {
  if (err) {
    return console.error('Error:', err);
  }
  console.log('Email sent:', info.response);
});
