const commands = {
	profile: {
		get: async ({ storage }) => storage.get('profile'),
		put: async ({ storage }, { username, password }) => storage.put('profile', { username, password }),
		del: async ({ storage }) => storage.delete('profile'),
	},
	session: {
		get: async ({ storage }, { id }) => storage.get(`session|${id}`),
		put: async ({ storage }, { id, secret, expired }) => storage.put(`session|${id}`, {
			id,
			secret,
			expired,
		}).then(() => ({ id, secret, expired })),
		del: async ({ storage }, { id }) => storage.delete(`session|${id}`),
	},
	sessions: {
		list: async ({ storage }, opts) => {
			const params = { prefix: 'session|' }
			if (opts?.limit) params.limit = opts.limit
			if (opts?.start) params.start = opts.start
			if (opts?.reverse) params.reverse = opts.reverse
			return storage
				.list(params)
				.then(map => Object.fromEntries(map))
		},
	},
}

export class User {
	constructor(state, env) {
		this.state = state
	}

	async fetch(request) {
		const body = request.method === 'POST' && request.headers.get('content-type')?.includes('application/json') && await request.json()
		/*
		The body here is expected to look like:

			[
				"profile",
				"put",
				{ "username": "saibotsivad", ...etc }
			]
		 */
		let command = commands[body?.[0]]?.[body?.[1]]
		if (command) {
			const result = await command(this.state, body[2])
			return new Response(JSON.stringify({ data: result }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		}
		return new Response(JSON.stringify({ ok: false }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	// another alternate approach would be maybe something like
	getProfile() {
		return this.state.storage.get('profile')
	}
	/*
	Then you could do something like

	async fetch(request) {
		const url = new URL(request.url)
		const [ , methodName ] = url.pathname.split('/)
		this[methodName](await request.json())
	}
	 */
}
