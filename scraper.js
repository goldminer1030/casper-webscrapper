var fs = require('fs'),
    casper = require("casper").create(),
    mouse = require("mouse").create(casper),
    isCaptchaNeeded = false,
    isAnyErrorOccurred = false,
    api_url = "http://azcaptcha.com",
    api_key = "",
    captcha_selector = "#continueBtn",
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
    captcha_in_request = {
      operation: "POST",
      encoding: "utf8",
      headers: {
        "Content-Type": "application/json"
      }
    },
    captcha_res_request = {
      operation: "POST",
      encoding: "utf8",
      headers: {
        "Content-Type": "application/json"
      }
    },
    simNumber = '89014102255039698818',
    imeiNumber = '359405084715737',
    serviceZip = '90210';

function sendActivateCode() {
  // Click continue button
  casper.then(function () {
    if (casper.exists('#continueBtn')) {
      this.captureSelector('continue-button.png', '#continueBtn');
      this.echo(this.captureBase64('png', '#continueBtn'));

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

function send_activecode_with_captcha(captcha_text) {
  // Form input
  casper.waitForSelector("form input#simnumber", function () {
    this.fillSelectors('form[name="activateGophnDeviceFrm"]', {
      'input#captcha': captcha_text,
    }, true);
  });

  // Click continue button
  sendActivateCode();
}

// Check if captcher is required
page.open('https://www.att.com/prepaid/activations/services/resources/acceptance/captcha/isCaptchaNeeded', settings, function (status) {
  if (status !== 'success') {
    this.echo('page not opening');
    isAnyErrorOccurred = true;
  } else {
    var resultObject = JSON.parse(page.plainText);
    this.echo("Getting response from the server:");
    if (resultObject['Result']['Status'] == 'SUCCESS') {
      this.echo('SUCCESS');
      isCaptchaNeeded = resultObject['isCaptchaNeeded'];
    } else {
      this.echo('FAILED');
    }
    this.echo('isCaptchaNeeded: ' + isCaptchaNeeded);
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
    this.echo('--- ALERT! CAPTCHA is requested ---');
    // If captcha is needed
    if (casper.exists(captcha_selector)) {
      // If captcha image is available
      var base64 = this.captureBase64('png', captcha_selector);

      page.open(api_url + '/in.php?key=' + api_key + '&method=base64&json=1&base64=' + base64, captcha_in_request, function (status) {
        if (status !== 'success') {
          this.echo('captcha page not opening');
          isAnyErrorOccurred = true;
        } else {
          var resultObject = JSON.parse(page.plainText);
          this.echo("Getting response from the captcha api server:");
          if (resultObject['Status'] == '1') {
            this.echo('SUCCESS');
            var capture_id = resultObject['request'], isReceivedCaptcha = false;

            do {
              // Make a 5 seconds timeout and submit a HTTP GET request to API URL providing the captcha ID.
              casper.wait(5000);
              // Request captcha
              page.open(api_url + '/res.php?key=' + api_key + '&action=get&id=' + capture_id, captcha_res_request, function (status) {
                if (status == 'success') {
                  var resultObject = JSON.parse(page.plainText);
                  this.echo("Getting response from the captcha api server:");
                  if (resultObject['Status'] == '1') {
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
            this.echo('FAILED');
          }
        }
      });
    } else {
      this.echo('Could not find the captcha');
    }
  } else {
    // Send the activate code
    sendActivateCode();
  }
}

casper.run();
