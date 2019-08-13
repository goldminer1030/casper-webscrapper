var fs = require('fs'),
    casper = require("casper").create({
      exitOnError: false
    }),
    isCaptchaNeeded = false,
    isAnyErrorOccurred = false,
    api_url = "http://azcaptcha.com",
    api_key = "",
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

function sendActivateCode() {
  // Click continue button
  casper.then(function () {
    if (this.exists('#continueBtn')) {
      this.click('#continueBtn');
      this.echo('click continue button');
    } else {
      this.echo('Could not find the continue button');
    }
  });
  // Capture the screen
  casper.then(function () {
    // Wait
    this.wait(5000);

    this.capture('final.jpg');
    this.echo('capture final screen');
  });
}

function send_activecode_with_captcha(captcha_text) {
  // Form input
  casper.waitForSelector("form input#captcha", function () {
    this.fillSelectors('form[name="activateGophnDeviceFrm"]', {
      'input#captcha': captcha_text,
    }, true);
  });

  // Click continue button
  sendActivateCode();
}

// Initialize casper
casper.userAgent('Mozilla/5.0 (compatible; MSIE 6.0; Windows NT 5.1)');
// listening to all resources requests
casper.on("resource.requested", listener);
// listening to all errors
casper.on("resource.error", errorListener);

// Start casper
casper.start();
// Check if captcher is required
casper.open('https://www.att.com/prepaid/activations/services/resources/acceptance/captcha/isCaptchaNeeded', {
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
}).then(function (response) {
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
    isAnyErrorOccurred = true;
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
  // Capture screen
  this.capture('second.jpg');
  this.echo('capture second screen');
  // Wait
  this.wait(2500);
});

casper.then(function() {
  if (!isAnyErrorOccurred) {
    this.echo('captcha? ' + isCaptchaNeeded);
    if (isCaptchaNeeded) {
      // If captcha is needed
      this.echo('--- ALERT! CAPTCHA is requested ---');
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
      this.echo(base64);

      this.thenOpen(api_url + '/in.php?key=' + api_key + '&method=base64&json=1&body=' + base64, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        encoding: 'utf8',
        data: base64
      }, function (response) {
        this.echo('response: ' + response.status);

        if (response.status == 200) {
          this.echo('this.page.plainText: ' + this.page.plainText);
          var resultObject = JSON.parse(this.page.plainText);
          this.echo("Getting response from the captcha api server:");
          this.echo(resultObject['status']);
          if (resultObject['status'] == 1) {
            this.echo('SUCCESS to get id from AZCaptcha');
            var capture_id = resultObject['request'], isReceivedCaptcha = false;

            do {
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
                  if (resultObject['status'] == 1) {
                    this.echo('SUCCESS');
                    isReceivedCaptcha = true;
                    var capture_success = resultObject['request'];

                    // Request with captcha
                    send_activecode_with_captcha(capture_success);
                  } else {
                    this.echo('FAILED');
                  }
                }
              });
            }
            while (!isReceivedCaptcha);
          } else {
            this.echo(resultObject['request']);
          }
        } else {
          this.echo('captcha page not opening');
          isAnyErrorOccurred = true;
        }
      });
    } else {
      // Send the activate code
      sendActivateCode();
    }
  }
});

casper.run();
