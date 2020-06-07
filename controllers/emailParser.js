var Imap = require('imap'),
    inspect = require('util').inspect;
var fs = require('fs'), fileStream; 
require('dotenv').config()
  
var imap = new Imap({
  user: 'TestITService123@gmail.com',
  password: process.env.EMAIL_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  markSeen: true,
  fetchUnreadOnStart: true
});

function findTextPart(struct) {
  for (var i = 0, len = struct.length, r; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      if (r = findTextPart(struct[i]))
        return r;
    } else if (struct[i].type === 'text'
               && (struct[i].subtype === 'plain'
                   || struct[i].subtype === 'html'))
      return [struct[i].partID, struct[i].type + '/' + struct[i].subtype];
  }
}

function getMsgByUID(uid, cb, partID) {
  var f = imap.seq.fetch(uid,
                         (partID
                          ? { bodies: [
                                'HEADER.FIELDS (TO FROM SUBJECT)',
                                partID[0]
                              ] }
                          : { struct: true })),
      hadErr = false;

  if (partID)
    var msg = { header: undefined, body: '', attrs: undefined };

  f.on('error', function(err) {
    hadErr = true;
    cb(err);
  });

  if (!partID) {
    f.on('message', function(m) {
      m.on('attributes', function(attrs) {
        partID = findTextPart(attrs.struct);
      });
    });
    f.on('end', function() {
      if (hadErr)
        return;
      if (partID)
        getMsgByUID(uid, cb, partID);
      else
        cb(new Error('No text part found'));
    });
  } else {
    f.on('message', function(m) {
      m.on('body', function(stream, info) {
        var b = '';
        stream.on('data', function(d) {
          b += d;
        });
        stream.on('end', function() {
          if (/^header/i.test(info.which))
            msg.header = Imap.parseHeader(b);
          else
            msg.body = b;
        });
      });
      m.on('attributes', function(attrs) {
        msg.attrs = attrs;
        msg.contentType = partID[1];
      });
    });
    f.on('end', function() {
      if (hadErr)
        return;
      cb(undefined, msg);
    });
  }
}

async function autoEmailUpdater(sentiment, db, bayes){

  return new Promise((resolve, reject) => {

  imap.connect();

  const email = {date : '',
                subject: '',
                from: '',
                to: '',
                body: '',
                reply_id: null,
                priority: '',
                sender: '',
                status: 'Awaiting Response',
                department_primary: '',
                department_secondary: '',
                positivity_rating: 0};

  console.log("Update request received");

  db.select('*').from('email').whereNull('reply_id').then((result) => {
    emailCount = result.length+1 ;

    imap.once('ready', function() {
    imap.openBox('INBOX', true, function(err, box) {
      if (err) throw err;

      // Number of emails in database is the same as number of emails on email
      console.log("Not null reply id: " + emailCount);
      console.log("Inbox message total: " + box.messages.total);
      if (emailCount == box.messages.total) {
        // throw Error("Datebase is up to date");
        imap.end();
        return reject();
        // console.log("Email is up to date!")
      }

      console.log("HERE!")

      // console.log("Updating now...");

      for(let i = emailCount; i <= box.messages.total; i++) {
      getMsgByUID(`${emailCount}:${i}`, function(err, msg) {
        if (err) throw err;

        email.date = msg.attrs.date;
        email.subject = msg.header.subject[0];
        email.from = msg.header.from[0];
        email.to = msg.header.to[0];
        

        let reply_item = null;

        /* Identifies whether item has a reply */
        db.select('*').from('email').where('client', '=', email.from)
        .then(emails => {
            emails.forEach((emailitem) => {

            const date = new Date(emailitem.time)
            const day = date.toString().substring(0, 3);
            const datenum = date.getDate();

            const monthNames = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ];
            const month = monthNames[date.getMonth()].substring(0, 3)
            const year = date.getFullYear();

            let hour = date.getHours();
            if (hour < 10) {
              hour = '0' + hour
            }

            let minute = date.getMinutes();
            if (minute < 10) {
              minute = '0' + minute
            }

            const emailDate = `On ${day}, ${datenum} ${month} ${year} at ${hour}:${minute}, IT Support <testitservice123@gmail.com> wrote`
            // console.log(emailDate)

            if (msg.body.includes(emailDate)) {

              // console.log("Reached here!")

              /* Returns email id, the body of the reply, and the primary and secondary departments */
              reply_item = ([emailitem.email_id, msg.body.split(emailDate)[0], emailitem.department_primary, emailitem.department_secondary]);
            }
          }) 
        })
        .then(()=> {

          if (reply_item === null) {
            email.reply_id = null;
            email.body = msg.body;
            const department = bayes.handleAllocate(msg.body)
            email.department_primary = department[0];
            email.department_secondary = department[1];
          } else {
            email.reply_id = reply_item[0];
            email.body = reply_item[1];
            email.department_primary = reply_item[2];
            email.department_secondary = reply_item[3];
          }



          const rating = sentiment.analyze(email.body);
          email.positivity_rating = rating.score;

          if (parseInt(rating.score) > parseInt(1)) {
              email.priority = 'Low';
          } else if (parseInt(rating.score) < parseInt(-1)) {
            email.priority = 'High';
          } else {
            email.priority = 'Medium';
          }

          db('email').insert({
            status: email.status,
            priority: email.priority,
            subject: email.subject,
            content: email.body,
            reply_id: email.reply_id,
            sender: email.from,
            positivity_rating: email.positivity_rating,
            department_primary: email.department_primary,
            department_secondary: email.department_secondary,
            client: email.from,
            time: email.date
          }).then((results) => {
            console.log('An email has been updated');
          }).catch((err) => {
            console.log("Datebase is up to date");
          })
          imap.end();
        })
        });
        }
        // console.log("Datebase is being updated!")
      })
    });
  })
})
}


module.exports = {
    autoEmailUpdater: autoEmailUpdater
    // getEmail: getEmail
}