const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
import env from "../env";

// Configure API key authorization: api-key
var apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = env.SMTP_PASSWORD;

var apiInstance = new SibApiV3Sdk.SMTPApi();

const sendinblue = (sendSmtpEmail) => {
  apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
      return true;
    }, function(error) {
      console.error(error);
      return false;
    });
}

module.exports = sendinblue