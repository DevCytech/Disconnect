const moment = require('moment');
require('moment-duration-format');

// Get Ordinal
module.exports.formatOrdinal = (i) => {
	const n  = i % 10;
	const x = i % 100;
	
	if (n === 1 && x !== 11) {
		return `${i}st`;	
	} else if (n === 2 && x!== 12) {
		return `${i}nd`;	
	} else if ( n == 3 && x !== 13) {
		return `${i}rd`;	
	} else {
		return `${i}th`;
	}
};

// Get Member
module.exports.fetchMember = (message, find = '') => {
	find = find.toLowerCase();

	let result = message.guild.members.cache.get(find) || message.mentions.members.first();

	if (!result && find) {
		result = message.guild.members.cache.find((user) => {
			return (
				user.displayName.toLowerCase().includes(find) ||
				user.user.tag.toLowerCase().includes(find)
			);
		});
	}

	if (!result) {
		return null;
	}
	return result;
};

// Time Since
module.exports.formatDate = (date) => {
	return moment.utc(date).format('ddd, DD MMM YYYY');
};

module.exports.formatTimeSince = (time) => {
	return moment
		.duration(time)
		.format('d [days], h [hours], m [minutes], [and] s [seconds]', {
			trim: 'small',
		});
};

// Date Since
module.exports.getTimeSince = function (date) {
	const years = moment().diff(date, 'years', false);
	const months = moment().diff(date, 'months', false) - 12 * years;
	const days = moment().diff(date, 'days', false) - 365 * years - 30 * months;
	let timesince = ''; 

	if (years !== 0) {
		timesince = months !== 0
			? `${years} ${years !== 1 ? 'years' : 'year'} and ${months} ${months !== 1 ? 'months' : 'month' } ago`
			: `${years} ${years !== 1 ? 'years' : 'year'} ago`;
	}
	
	if (months !== 0) {
		timesince = days !== 0
			? `${months} ${months !== 1 ? 'months' : 'month'} and ${days} ${days !== 1 ? 'days' : 'day'} ago`
			: `${months} ${months !== 1 ? 'months' : 'month'} ago`;
	}
	
	return `${
		timesince 
			? timesince 
			: days === 0
			? 'less than a day'
			: days !== 1
			? `${days} days`
			: `${days}day`
	} ago`;
};
