// HOME
Router.route('/', {
  name: 'home',
  controller: 'HomeController'
});

Router.route('/pricing', {
  name: 'pricing',
  controller: 'HomeController'
});

Router.route('/faq', {
  name: 'faq',
  controller: 'HomeController'
});

Router.route('/about', {
  name: 'about',
  controller: 'HomeController'
});

Router.route('/tandc', {
  name: 'tandc',
  controller: 'HomeController'
});

Router.route('/jobs', {
  name: 'jobs',
  controller: 'HomeController'
});

Router.route('/privacy', {
  name: 'privacy',
  controller: 'HomeController'
});

Router.route('/features', {
  name: 'features',
  controller: 'HomeController'
});

Router.route('/contact', {
  name: 'contact',
  controller: 'HomeController'
});

Router.route('/security', {
  name: 'security',
  controller: 'HomeController'
});

Router.route('/blog', {
  name: 'blog',
  controller: 'HomeController'
});
// END OF HOME

Router.route('/dashboard/', {
  name: 'dashboard',
  controller: 'DashboardController'
});

Router.route('/create/', {
  name: 'organization.create',
  controller: 'OrganizationCreateController'
});

Router.route('/project/', {
  name: 'project.current',
  controller: 'ProjectController'
});

Router.route('/client/', {
  name: 'project.client',
  controller: 'ProjectClientController'
});

Router.route('/project/manage/', {
  name: 'project.manage',
  controller: 'ProjectManageController'
});

Router.route('/project/file/:_storeId/', {
  name: 'project.file',
  controller: 'ProjectFileController'
});

Router.route('/member/:_userEmail/', {
  name: 'organization.member',
  controller: 'OrganizationMembersController'
});

Router.route('/integrations/', {
  name: 'integrations',
  controller: 'IntegrationController'
});

Router.route('/integration/:_integrationId/', {
  name: 'integrationDetail',
  controller: 'IntegrationDetailController'
});

Router.route('/data/', {
  name: 'data.detail',
  controller: 'DataController'
});

Router.route('/profile/', {
  name: 'profile',
  controller: 'ProfileController'
});

Router.route('/invites/', {
  name: 'invites',
  controller: 'InvitesController'
});

Router.route('/logout/', function(){
    var self = this;
    AccountsTemplates.logout();
});

Router.plugin('ensureSignedIn', {
  // only: ['dashboard']
  except: [
    'home',
    'atSignIn',
    'atSignUp',
    'atForgotPassword',
    'atResetPwd',
    'logout',
    'pricing',
    'faq',
    'about',
    'tandc',
    'jobs',
    'privacy',
    'features',
    'security',
    'blog',
    'contact'
  ]
});
