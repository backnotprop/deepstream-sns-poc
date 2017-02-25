let AWS = require('aws-sdk');
let http = require('http');
let deepstreamClient = require('deepstream.io-client-js');

/**
 * Configs
 * 
 */

let ds = deepstreamClient('localhost:6021').login({}, createHttpServer);

AWS.config.update({
	"secretAccessKey": ".",
	"sessionToken": ".",
	"accessKeyId": ".",
	"region": "us-east-1"
});

let sns = new AWS.SNS();


/**
 * SNS Setup
 * 
 */

const onAwsResponse = (err, data) => {
	console.log(error || data);
}

// subscribing to sns arn and endpoint
const subscribeToSnS = () => {
	let params = {
		Protocol: 'http',
		TopicArn: '.',
		Endpoint: '.'
	}

	sns.subscribe(params, onAwsResponse);
}

const parseJSON = (input) => {
	try {
		return JSON.parse(input);
	} catch (e) {
		return input;
	}
}

const handleIncomingMessage = (msgType, msgData) => {
	// on startup, will need to confirm SubscriptionConfirmation
	// otherwise we are handling notifications
	if (msgType === 'SubscriptionConfirmation') {
		sns.confirmSubscription({
			Token: msgData.Token,
			TopicArn: msgData.TopicArn
		}, onAwsResponse);
	} else if (msgTyp === 'Notification') {
		// deepstream (other server) will emit the message to the browser
		ds.event.emit(msgData.Subject, parseJSON(msgData.Message));
	} else {
		console.log("Unexpected Message Type: ", msgType)
	}
}


/**
 * Server Setup
 * 
 */

const createHttpServer = () => {
	let server = new http.Server();

	server.on('request', (req, res) => {
		let msgBody = '';

		req.setEncoding('utf8');

		req.on('data', (data) => {
			msgBody += data;
		});

		req.on('end', () => {
			let msgData = parseJSON(msgBody);
			// sns message type, "SubscriptionConfirmation" || "Notification"
			let msgType = req.headers['x-amz-sns-message-type'];
			handleIncomingMessage(msgType, msgData);
		});

		// SNS doesnt care about our response as long as 200
		res.end('OK');
	});

	server.listen(6001, subscribeToSnS);

}

