if (Meteor.isServer) {
    // In your server code: define a method that the client can call
    Meteor.methods({
        sendEmailInternal: function (to, from, subject, text) {
            check([to, from, subject, text], [String]);
            console.log("Sending emailing");

            this.unblock();

            Email.send({
                to: to,
                from: from,
                subject: subject,
                text: text
            });
        },

        "email:send:error": function(userId, orgId, error) {
            this.unblock();
            const adminEmail = Meteor.settings.emails.admin;
            const user = Meteor.users.findOne({_id: userId});
            const email = user.profile.email || user.emails[0].address;

            try {
                error = JSON.stringify(error)
            } catch(e) {};

            const subject = `User=[${userId} : ${email}] & Org=${orgId}`;
            Email.send({
                from: "postmaster@sandbox16a0dac878ef41c2ada63144230c5f44.mailgun.org",
                to: adminEmail,
                subject: subject,
                text: error
            });
        },

        "email:send:admin:signup": function (email) {
            check([email], [String]);
            this.unblock();

            Email.send({
                from: "postmaster@sandbox16a0dac878ef41c2ada63144230c5f44.mailgun.org",
                to: Meteor.settings.emails.admin,
                subject: email + " signed up",
                text: ""
            });
        }
    });
}
