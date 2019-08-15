var fs = require('fs'),
    casper = require("casper").create({
      exitOnError: false
    }),
    x = require('casper').selectXPath,
    isCaptchaNeeded = false,
    api_url = "http://azcaptcha.com",
    api_key = "",
    listener = function (resource, request) {
      if (resource.url == 'https://www.att.com/prepaid/activations/services/resources/unauth/activation/inquireDeviceProfileDetails') {
        fs.write('headers.json', JSON.stringify(resource.headers), 'w');
        this.echo('Wrote to file');
      }
    }
    errorListener = function (resourceError) {
      this.echo("Resource error: " + "Error code: " + resourceError.errorCode + " ErrorString: " + resourceError.errorString + " url: " + resourceError.url + " id: " + resourceError.id, "ERROR");
    },
    simNumber = '89014102255039698818',
    imeiNumber = '359405084715737',
    serviceZip = '90210',
    capture_text = '';

// Initialize casper
casper.userAgent('Mozilla/5.0 (compatible; MSIE 6.0; Windows NT 5.1)');
// listening to all resources requests
casper.on("resource.requested", listener);
// listening to all errors
casper.on("resource.error", errorListener);

// Start casper
casper.start();
// Check if captcher is required
casper.thenOpen('https://www.att.com/prepaid/activations/services/resources/acceptance/captcha/isCaptchaNeeded', {
  method: 'post',
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
});

casper.then(function (response) {
  if (response.status == 200) {
    var resultObject = JSON.parse(this.page.plainText);
    this.echo("Getting response from the server:");
    if (resultObject['Result']['Status'] == 'SUCCESS') {
      this.echo('SUCCESS');
      isCaptchaNeeded = resultObject['isCaptchaNeeded'];
    } else {
      this.echo('FAILED');
    }
    this.echo('isCaptchaNeeded: ' + isCaptchaNeeded);
  } else {
    this.echo('page not opening');
  }
});

// load the start page
casper.thenOpen('https://www.att.com/prepaid/activations/#/activate.html', function () {
  this.echo(this.getTitle());
});

casper.then(function () {
  // Form input
  this.waitForSelector("form input#simnumber", function () {
    this.fillSelectors('form[name="activateGophnDeviceFrm"]', {
      'input#simnumber': simNumber,
      'input#imeinumber': imeiNumber,
      'input#servicezip': serviceZip
    }, true);
  });
});

casper.then(function() {
  // Capture screen
  this.capture('second.jpg');
  this.echo('capture second screen');
});

casper.thenBypassIf(function () {
  return isCaptchaNeeded ==  false;
}, 10);

// refresh captcha
casper.thenClick(x('//img[contains(@src,"images/refresh-captcha.png")]'), function () {
  this.echo("refresh captcha!");
});

casper.wait(5000, function () {
  this.echo("I've waited for 5 seconds.");
});

casper.then(function() {
  this.capture('captcha.jpg', {
    top: 484,
    left: 17,
    width: 131,
    height: 42
  });
  var base64 = this.captureBase64('jpeg', {
    top: 484,
    left: 17,
    width: 131,
    height: 42
  });
  
  casper.thenOpen(api_url + '/in.php', {
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
    },
    data: "\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name=\"key\"\r\n\r\n" + api_key +
      "\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name=\"method\"\r\n\r\nbase64\r\n" +
      "------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name=\"json\"\r\n\r\n1\r\n" +
      "------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name=\"body\"\r\n\r\n" + base64 +
      "\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--"
  }, function (response) {
    this.echo('response: ' + response.status);
  
    if (response.status == 200) {
      this.echo('this.page.plainText: ' + this.page.plainText);
      var resultObject = JSON.parse(this.page.plainText);
      this.echo("Getting response from the captcha api server:");
      this.echo(resultObject['status']);
      if (resultObject['status'] == 1) {
        this.echo('SUCCESS to get id from AZCaptcha');
        var capture_id = resultObject['request'];
        
        // Make a 5 seconds timeout and submit a HTTP GET request to API URL providing the captcha ID.
        this.wait(5000);

        // Request captcha
        this.thenOpen(api_url + '/res.php?key=' + api_key + '&action=get&json=1&id=' + capture_id, {
          method: 'get',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          encoding: 'utf8'
        }, function (response) {
          if (response.status == 200) {
            var resultObject = JSON.parse(this.page.plainText);
            this.echo("Getting response from the captcha api server:");
            this.echo(this.page.plainText);
            if (resultObject['status'] == 1) {
              this.echo('SUCCESS');
              isReceivedCaptcha = true;
              capture_text = resultObject['request'];

            } else {
              this.echo(resultObject['request']);
            }
          }
        });
      } else {
        this.echo(resultObject['request']);
      }
    } else {
      this.echo('captcha page not opening');
    }
  });
});

casper.back(function() {
  this.echo(this.getCurrentUrl());
});

casper.back(function() {
  this.echo(this.getCurrentUrl());
});

casper.wait(5000);

casper.then(function() {
  this.sendKeys('#captcha', capture_text);
});

casper.wait(500);

casper.waitForSelector("#continueBtn", function () {
  this.echo("I'm sure #continueBtn is available in the DOM");
});

casper.thenClick('#continueBtn', function () {
  // Click continue button
  this.echo('clicked continue button');
});

casper.wait(5000);

casper.then(function () {
  // Capture the screen
  this.capture('final.jpg');
  // And exit
  this.echo('capture final screen');
});

casper.run();
