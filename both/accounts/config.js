Meteor.startup(function() {
    if (!Accounts.emailTemplates) return;

    Accounts.emailTemplates.resetPassword.text = function(user, url) {
        url = url.replace('#/', '');
        return "Click this link to reset your password: " + url;
    };
});


AccountsTemplates.configure({
    showForgotPasswordLink: true,
    overrideLoginErrors: false,

    preSignUpHook: function(password, info) {
        var self = this;
        info.profile["email"] = info.email;
        return info;
    },

    onLogoutHook: function() {
        Router.go("home");
    }
});

AccountsTemplates.configureRoute('signIn', {
    layoutTemplate: 'authLayout',
    redirect: function() {
        const user = Meteor.user();
        if (user) {
            if (user.profile.isClient) {
                return Router.go("project.client");

            } else {
                return Router.go("project.current");

            }
        }

        return Router.go("home");
    }
});

AccountsTemplates.configureRoute('signUp', {
    layoutTemplate: 'authLayout',
    redirect: function() {
        const user = Meteor.user();
        if (user) {
            if (user.profile && user.profile.current_organization) {
                if (user.profile.isClient) {
                    return Router.go("project.client");

                } else {
                    return Router.go("project.current");
                }
            } else {
                return Router.go("organization.create");
            }
        };

    }
});

AccountsTemplates.configureRoute('resetPwd', {
    layoutTemplate: 'authLayout',
    redirect: function() {
        return Router.go("project.current");
    }
});

AccountsTemplates.addField({
    _id: 'invite_code',
    type: 'hidden',
    func: function(invite_code) {}
});

AccountsTemplates.configureRoute('ensureSignedIn', {
    layoutTemplate: 'homeLayout'
});
