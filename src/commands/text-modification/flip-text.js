const { flip_text: flipText } = require('../../utils/translate');
const { createEmbed, improperUsage } = require('../../utils/embed');

module.exports.run = async ({ message, args }) => {
	if (!args[0])
		return message.channel.send(
			improperUsage('Please provide text you would like to flip.'),
		);
	else {
		const e = await createEmbed({
			title: 'I have flipped the text...',
			body: await flipText(args.join(' ')),
		});
		return message.channel.send(e);
	}
};

module.exports.config = {
	name: 'flip-text',
};
