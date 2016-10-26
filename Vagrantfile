# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provider "virtualbox" do |v|
      v.memory = 2048
      v.cpus = 2
  end

  # config.vm.network :forwarded_port, guest: 3000, host: 3000
  # config.vm.network :forwarded_port, guest: 3001, host: 3001
  # config.vm.network :forwarded_port, guest: 3002, host: 3002
  # config.vm.synced_folder "/Users/gitumarkk/.ssh/", "/home/vagrant/.ssh/"

  config.vm.provision "shell", inline: <<-SHELL
      sudo apt-get update
      sudo apt-get install python-software-properties
      sudo apt-get install software-properties-common
      sudo apt-get update
  #   sudo apt-get install -y apache2
  SHELL
end
