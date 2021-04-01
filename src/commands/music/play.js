const path = require('path');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const request = require('request');
const { Util } = require('discord.js');
const log = require('../../utils/logger');
const spotify = require('spotify-url-info');
const scdl = require('soundcloud-downloader').default;
const { run: playPlaylist } = require('./playlist');
const { existsSync, createWriteStream, mkdirSync } = require('fs');
const { improperUsage, musicEmbed } = require('../../utils/embed');

// Temp files storage
if (!existsSync(path.join('./temp'))) {
	mkdirSync('./temp');
}
const TempFilesPath = path.join('./temp', '');

async function manageQueue(client, message, channel, serverQueue, song) {
	// Add song to queue if queue is set
	if (serverQueue) {
		serverQueue.songs.push(song);
		return message.channel.send(
			musicEmbed(
				'Song Added to Queue',
				`[${song.title}](${song.url}) has been added to the queue by ${message.author}.`,
			),
		);
	}

	// Construct queue variable
	const queueItem = {
		textChannel: message.channel,
		voiceChannel: channel,
		connection: null,
		dispatcher: null,
		songs: [song],
		volume: 50,
		playing: false,
		loop: false,
		filters: [],
	};
	client.queue.set(message.guild.id, queueItem);

	// Play the song
	const { play } = require('../../utils/play');
	const connection = await channel.join().catch((err) => {
		client.queue.delete(message.guild.id);
		message.channel.send(
			improperUsage(`I was unable to join the voice channel: ${err}`),
		);
		return log.client.error(`Unable to join voice channel: ${err}`);
	});
	if (!connection) return await channel.leave();
	await connection.voice.setSelfDeaf(true);

	// Set queue
	queueItem.connection = connection;
	play(queueItem);
}

module.exports.run = async ({ client, args, message }) => {
	// Check voice channel
	const channel = message.member.voice.channel;
	if (!channel) {
		return message.channel.send(
			improperUsage('Please join a voice channel to use this command.'),
		);
	}

	// Get server queue
	const serverQueue = client.queue.get(message.guild.id);

	// Check Permissions
	if (!serverQueue || !serverQueue.voiceChannel) {
		const permissions = channel.permissionsFor(message.client.user);
		if (!permissions.has('CONNECT')) {
			return message.channel.send(
				improperUsage('I am unable to connect to your voice channel.'),
			);
		}
		if (!permissions.has('SPEAK')) {
			return message.channel.send(
				improperUsage('I am unable to speak in your voice channel.'),
			);
		}
	}

	// Search, File, and URL
	const file = message.attachments.first();
	const search = args.join(' ');
	if (!search && !file) {
		return message.channel.send(
			improperUsage('Please provide a song you would like to play'),
		);
	}
	const url = args[0] ? args[0].replace(/<(.+)>/g, '$1') : '';

	// Get song info and song
	let songInfo = null;
	let song = null;

	// Get song
	if (file) {
		// Manage files
		if (!file.name.endsWith('.mp3')) {
			return message.channel.send('I only support mp3 files sorry!!');
		}

		// Get Song Info
		const FileName = file.name.replace(/[&/\\#,+()$~%'":*?<>{}|_-]/g, '');
		const FilePath = path.resolve(TempFilesPath, FileName);
		const Title = FileName.slice(0, FileName.lastIndexOf('.'));

		// Download file
		if (!existsSync(FilePath)) {
			const stream = request.get(file.url);

			stream.on('error', (err) => {
				log.client.error(err);
				return message.channel.send(
					'I was unable to get file to play.',
				);
			});

			stream.pipe(createWriteStream(FilePath));
			stream.on('complete', () => {
				song = {
					id: file.url,
					isFile: true,
					url: file.url,
					file: FilePath,
					title: Title,
					req: message.author,
				};
				manageQueue(client, message, channel, serverQueue, song);
			});
			return;
		}

		song = {
			id: file.url,
			isFile: true,
			url: file.url,
			file: FilePath,
			title: Title,
			req: message.author,
		};
	} else if (
		url.match(/^https?:\/\/(cdn.discordapp\.com)\/(.*)$/gi) ||
		url.match(/^https?:\/\/(discord\.com)\/(.*)$/gi)
	) {
		if (url.endsWith('.mp3')) {
			const name = url.split('/')[url.split('/').length - 1];

			// Get Song Info
			const FileName = name.replace(/[&/\\#,+()$~%'":*?<>{}|_-]/g, '');
			const FilePath = path.resolve(TempFilesPath, FileName);
			const Title = FileName.slice(0, FileName.lastIndexOf('.'));

			// Download file
			if (!existsSync(FilePath)) {
				const stream = request.get(file.url);

				stream.on('error', (err) => {
					log.client.error(err);
					return message.channel.send(
						'I was unable to get file to play.',
					);
				});

				stream.pipe(createWriteStream(FilePath));
				stream.on('complete', () => {
					song = {
						id: url,
						isFile: true,
						url: url,
						file: FilePath,
						title: Title,
						req: message.author,
					};
					manageQueue(client, message, channel, serverQueue, song);
				});
				return;
			}

			song = {
				id: url,
				isFile: true,
				url: url,
				file: FilePath,
				title: Title,
				req: message.author,
			};
		} else {
			// Get message and if there are no attachments then return
			const channelID = url.split('/channels/')[1].split('/')[1];
			const messageID = url.split('/channels/')[1].split('/')[2];

			if (!channelID || !messageID) {
				return message.channel.send(
					improperUsage(
						'I could not find a channel or message id in the link.',
					),
				);
			}

			// Get Channel
			const MSGChannel = message.guild.channels.cache.get(channelID);
			if (!MSGChannel) {
				return message.channel.send(
					improperUsage(
						'I was unable to find a channel using your link.',
					),
				);
			}

			// Get message
			const msg = await MSGChannel.messages.fetch(messageID);
			if (!msg) {
				return message.channel.send(
					improperUsage(
						'I was unable to find a message using your link.',
					),
				);
			}

			// If message has an attachement
			const MSGFile = msg.attachments.first();
			if (!MSGFile || !MSGFile.name.endsWith('.mp3')) {
				return message.channel.send(
					improperUsage(
						'I could not find a supported file attachment on the message link.',
					),
				);
			}

			// Get Song Info
			const FileName = MSGFile.name.replace(
				/[&/\\#,+()$~%'":*?<>{}|_-]/g,
				'',
			);
			const FilePath = path.resolve(TempFilesPath, FileName);
			const Title = FileName.slice(0, FileName.lastIndexOf('.'));

			// Download file
			if (!existsSync(FilePath)) {
				const stream = request.get(MSGFile.url);

				stream.on('error', (err) => {
					log.client.error(err);
					return message.channel.send(
						'I was unable to get file to play.',
					);
				});

				stream.pipe(createWriteStream(FilePath));
				stream.on('complete', () => {
					song = {
						id: MSGFile.url,
						isFile: true,
						url: MSGFile.url,
						file: FilePath,
						title: Title,
						req: message.author,
					};
					manageQueue(client, message, channel, serverQueue, song);
				});
				return;
			}

			song = {
				id: MSGFile.url,
				isFile: true,
				url: MSGFile.url,
				file: FilePath,
				title: Title,
				req: message.author,
			};
		}
	} else if (
		url.match(
			/^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi,
		) &&
		!/^.*(youtu.be\/|list=)([^#&?]*).*/gi.test(url)
	) {
		// Manage youtube links
		songInfo = await ytdl.getInfo(url).catch(log.client.error);
		if (!songInfo) {
			return message.channel.send(
				improperUsage('I was unable to find this song on YouTube.'),
			);
		}

		song = {
			id: songInfo.videoDetails.videoId,
			title: songInfo.videoDetails.title,
			url: songInfo.videoDetails.video_url,
			img:
				songInfo.player_response.videoDetails.thumbnail.thumbnails[0]
					.url,
			duration: songInfo.videoDetails.lengthSeconds,
			ago: songInfo.videoDetails.publishDate,
			views: String(songInfo.videoDetails.viewCount).padStart(10, ' '),
			req: message.author,
		};

		// Get ready for live streams
		if (
			songInfo.player_response &&
			songInfo.player_response.videoDetails.isLiveContent
		) {
			song.isLive = true;
		}
	} else if (
		url.match(
			/^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi,
		) &&
		/^.*(youtu.be\/|list=)([^#&?]*).*/gi.test(url)
	) {
		return playPlaylist({ client, args, message });
	} else if (url.match(/^https?:\/\/(soundcloud\.com)\/(.*)$/gi)) {
		// Manage soundcloud links
		songInfo = await scdl.getInfo(url).catch(log.client.error);
		if (!songInfo) {
			return message.channel.send(
				improperUsage(
					'I was unable to find information on this song on sound cloud.',
				),
			);
		}

		song = {
			id: songInfo.permalink,
			title: songInfo.title,
			url: songInfo.permalink_url,
			img: songInfo.artwork_url,
			ago: songInfo.last_modified,
			views: String(songInfo.playback_count).padStart(10, ' '),
			duration: Math.ceil(songInfo.duration / 1000),
			req: message.author,
		};
	} else if (
		url.match(
			/(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(track)[/:]([A-Za-z0-9]+)/,
		)
	) {
		// Manage Spotify Links
		const tempSongInfo = await spotify.getPreview(url);
		const searchResult = await yts.search(
			`${tempSongInfo.artist} - ${tempSongInfo.title} lyrics`,
		);
		if (!searchResult.videos.length) {
			return message.channel.send(
				improperUsage('I was unable to find the song'),
			);
		}

		songInfo = searchResult.videos[0];
		song = {
			id: songInfo.videoId,
			title: Util.escapeMarkdown(songInfo.title),
			views: String(songInfo.views).padStart(10, ' '),
			url: songInfo.url,
			ago: songInfo.ago,
			duration: songInfo.duration.toString(),
			img: songInfo.image,
			req: message.author,
		};
	} else if (
		url.match(
			/(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(playlist)[/:]([A-Za-z0-9]+)/,
		)
	) {
		return playPlaylist({ client, args, message });
	} else {
		// Search for songs via YouTube if song was not a link.
		const searchResult = await yts.search(search).catch(log.client.error);
		if (!searchResult.videos.length) {
			return message.channel.send(
				improperUsage('I was unable to find the song on youtube'),
			);
		}

		songInfo = searchResult.videos[0];
		song = {
			id: songInfo.videoId,
			title: Util.escapeMarkdown(songInfo.title),
			views: String(songInfo.views).padStart(10, ' '),
			url: songInfo.url,
			ago: songInfo.ago,
			duration: songInfo.duration.toString(),
			img: songInfo.image,
			req: message.author,
		};
	}

	// Setup Queue
	await manageQueue(client, message, channel, serverQueue, song);
};

module.exports.config = {
	name: 'play',
	aliases: ['p'],
};
