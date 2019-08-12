var fs = require('fs'),
    casper = require("casper").create(),
    mouse = require("mouse").create(casper);
    isCaptchaNeeded = false;
    isAnyErrorOccurred = false;
    page = require("webpage").create(),
    settings = {
      operation: "POST",
      encoding: "utf8",
      headers: {
          "Content-Type": "application/json",
          "X-Requested-By": "MYATT"
      },
      data: JSON.stringify({
        "CommonData": {
          "AppName": "PREPAID_ACTIVATION"
        },
        "app": "prepaid"
      })
    },
    listener = function (resource, request) {
      if (resource.url == 'https://www.att.com/prepaid/activations/services/resources/unauth/activation/inquireDeviceProfileDetails') {
        fs.write('headers.json', JSON.stringify(resource.headers), 'w');
        this.echo('Wrote to file');
      }
    }
    errorListener = function (resourceError) {
      isAnyErrorOccurred = true;
      this.echo("Resource error: " + "Error code: " + resourceError.errorCode + " ErrorString: " + resourceError.errorString + " url: " + resourceError.url + " id: " + resourceError.id, "ERROR");
    },
    simNumber = '89014102255039698818',
    imeiNumber = '359405084715737',
    serviceZip = '90210';

// Check if captcher is required
page.open('https://www.att.com/prepaid/activations/services/resources/acceptance/captcha/isCaptchaNeeded', settings, function (status) {
  if (status !== 'success') {
    console.log('page not opening');
    isAnyErrorOccurred = true;
  } else {
    var resultObject = JSON.parse(page.plainText);
    console.log("Getting response from the server:");
    if (resultObject['Result']['Status'] == 'SUCCESS') {
      console.log('SUCCESS');
      isCaptchaNeeded = resultObject['isCaptchaNeeded'];
    } else {
      console.log('FAILED');
    }
    console.log('isCaptchaNeeded: ' + isCaptchaNeeded);
  }
});

// Initialize casper
casper.userAgent('Mozilla/5.0 (compatible; MSIE 6.0; Windows NT 5.1)');
// listening to all resources requests
casper.on("resource.requested", listener);
// listening to all errors
casper.on("resource.error", errorListener);

// load the start page
casper.start('https://www.att.com/prepaid/activations/#/activate.html', function () {
  this.echo(this.getTitle());
});
// Form input
casper.waitForSelector("form input#simnumber", function () {
  this.fillSelectors('form[name="activateGophnDeviceFrm"]', {
    'input#simnumber': simNumber,
    'input#imeinumber': imeiNumber,
    'input#servicezip': serviceZip
  }, true);
});
// Capture screen
casper.then(function () {
  casper.capture('second.png');
  this.echo('capture second screen');
});
// Wait
casper.wait(500);

if(!isAnyErrorOccurred) {
  if(isCaptchaNeeded) {
    // If captcha is needed
  }
  // Click continue button
  casper.then(function () {
    if (casper.exists('#continueBtn')) {
      casper.click('#continueBtn');
      this.echo('click continue button');
    } else {
      this.echo('Could not find the continue button');
    }
  });
  // Wait
  casper.wait(5000);
  // Capture the screen
  casper.then(function () {
    casper.capture('final.png');
    this.echo('capture final screen');
  });
}

casper.run();
