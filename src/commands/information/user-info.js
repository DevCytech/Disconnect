const { MessageEmbed } = require('discord.js');
const { fetchMember, formatDate, getTimeSince } = require('../../tools');
const { secondary } = require('../../../assets/config/colors.json');

module.exports.run = async ({ message, args }) => {
	// Get user
	let member;
	if (args[0]) member = fetchMember(message, args.join(' '));
	if (!member || typeof member !== 'object') member = message.member;

	const roles = [];
	let i = 0;

	for (const role of member.roles.cache) {
		if (roles.length < 10) roles.push(role[1]);
		else i++;
	}

	// Display Avatar
	const e = new MessageEmbed()
		.setTitle(member.displayName)
		.setThumbnail(
			member.user
				.displayAvatarURL({ dynamic: true })
				.replace('.webp', '.png') + '?size=2048',
		)
		.setColor(
			member.displayHexColor == '#000000'
				? secondary
				: member.displayHexColor,
		)
		.setDescription(
			`**Joined Guild**: ${formatDate(member.joinedAt)} - ${getTimeSince(
				member.joinedAt,
			)} \n**Account Created**: ${formatDate(
				member.user.createdAt,
			)} - ${getTimeSince(member.user.createdAt)} ${
				member.lastMessage && member.lastMessage.content.length > 0
					? `\n **Last Message**: ${member.lastMessage}`
					: ''
			}`,
		)
		.addField(
			`Roles (${member.roles.cache.size})`,
			`${roles.join(', ')} ${
				i > 0 ? `+ ${i} more role${i > 1 ? 's' : ''}` : ''
			}`,
		)
		.setFooter(`${member.user.tag} • ${member.user.id}`);
	return message.channel.send(e);
};

module.exports.config = {
	name: 'user-info',
	aliases: [
		'user-info',
		'member-info',
		'member-information',
		'member',
		'user',
		'm-i',
		'u-i',
	],
};
