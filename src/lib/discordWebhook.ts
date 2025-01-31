const fireWebhook = async (url: string, body) => {
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			console.warn(`HTTP error! status: ${response.status}`);
		}

		console.log('Webhook sent successfully');
	} catch (error) {
		console.error('Error sending webhook:', error);
	}
};

export { fireWebhook };
