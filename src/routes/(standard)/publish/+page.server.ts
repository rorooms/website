import { env } from '$env/dynamic/private';
import { fireWebhook } from '$lib/discordWebhook';
import { getUniverseDetails, getUniverseId, userOwnsPlace } from '$lib/robloxApi';
import { isPlaceRegistered, placePassesChecks, updateWorld } from '../../../githubApp';
import { fail } from '@sveltejs/kit';

function fireDiscordWebhook(placeId: string) {
	if (!env.DISCORD_WEBHOOK_URL) {
		return;
	}

	return fireWebhook(env.DISCORD_WEBHOOK_URL, {
		content: `## New world published! <:Rorooms:1298030027182706809>\n\nhttps://roblox.com/games/${placeId}`,
		embeds: null,
		attachments: []
	});
}

export const actions = {
	publish: async (event) => {
		const session = await event.locals.auth();
		const formData = await event.request.formData();

		const robloxProfile = session?.user.robloxProfile;
		const tosAccepted = formData.get('tosAccepted');
		const placeId = formData.get('placeId');

		if (tosAccepted == 'on' && typeof placeId == 'string') {
			if (robloxProfile) {
				const ownsPlace = await userOwnsPlace(robloxProfile.sub, placeId);
				const universeId = await getUniverseId(placeId);
				const universeDetails = await getUniverseDetails(universeId);
				const alreadyRegistered = await isPlaceRegistered(placeId);
				const checkPass = placePassesChecks(placeId, universeDetails);

				if (ownsPlace) {
					if (checkPass.passed || alreadyRegistered) {
						try {
							const success = await updateWorld(placeId, {
								initialRegistration: !alreadyRegistered,
								delist: !checkPass.passed,
								universeId: universeId
							}).then((result) => {
								if (result == true) {
									console.log(`${robloxProfile.name} updated ${placeId}! 🎉`);
									fireDiscordWebhook(placeId);
								}

								return { success: result == true };
							});

							if (success.success) {
								return success;
							} else {
								return fail(400, {
									reason:
										'Did not update/publish world. Either there were no changes to publish, or there was an error during publishing.'
								});
							}
						} catch (error) {
							console.error(error);
						}
					} else {
						return fail(404, { reason: 'World failed checks.', checks: checkPass.checks });
					}
				} else {
					return fail(403, { reason: "You don't own this place." });
				}
			} else {
				return fail(401, { reason: 'Unauthenticated with Roblox.' });
			}
		} else {
			return fail(400, { reason: 'Missing form data.' });
		}

		return fail(500, { reason: 'Unknown rejection.' });
	}
};
