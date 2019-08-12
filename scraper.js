var fs = require('fs');
var casper = require("casper").create();
var mouse = require("mouse").create(casper);
casper.userAgent('Mozilla/5.0 (compatible; MSIE 6.0; Windows NT 5.1)');
//var cookieFileName = 'cookies.txt';
// listener function for requested resources
var listener = function (resource, request) {
  if (resource.url == 'https://www.att.com/prepaid/activations/services/resources/unauth/activation/inquireDeviceProfileDetails') {
    fs.write('headers.json', JSON.stringify(resource.headers), 'w');
    this.echo('Wrote to file');
  }
};

// Check if captcher is required
var isCaptchaNeeded = false;
var page = require("webpage").create(),
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
};

page.open('https://www.att.com/prepaid/activations/services/resources/acceptance/captcha/isCaptchaNeeded', settings, function (status) {
  if (status !== 'success') {
    console.log('page not opening');
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


// listening to all resources requests
casper.on("resource.requested", listener);

// load the start page
casper.start('https://www.att.com/prepaid/activations/#/activate.html', function () {
  this.echo(this.getTitle());
})
// .then(function () {
//   this.open('https://www.att.com/prepaid/activations/services/resources/acceptance/captcha/isCaptchaNeeded', {
//     method: 'post',
//     data: {
//       "CommonData": {
//         "AppName": "PREPAID_ACTIVATION"
//       },
//       "app": "prepaid"
//     }
//   });
// });

// Form.Submit
casper.waitForSelector("form input#simnumber", function () {
  this.fillSelectors('form[name="activateGophnDeviceFrm"]', {
    'input#simnumber': '89014102255039698818',
    'input#imeinumber': '359405084715737',
    'input#servicezip': '90210'
  }, true);
});

casper.then(function () {
  casper.capture('second.png');
  this.echo('capture second screen');
});

casper.wait(500);

// Click button
casper.then(function () {
  if (casper.exists('#continueBtn')) {
    casper.click('#continueBtn');
    this.echo('click continue button');
  } else {
    this.echo('Could not find the continue button');
  }
});

casper.wait(5000);

casper.then(function () {
  casper.capture('final.png');
  this.echo('capture final screen');
});

casper.run();

casper.on("resource.error", function (resourceError) {
  this.echo("Resource error: " + "Error code: " + resourceError.errorCode + " ErrorString: " + resourceError.errorString + " url: " + resourceError.url + " id: " + resourceError.id, "ERROR");
});
