export class Durable {
	constructor(state, env) {
		this.state = state
		this.env = env
	}

	async fetch(request) {
		const body = request.method === 'POST' && request.headers.get('content-type')?.includes('application/json') && await request.json()
		/*
		The body is expected to look like:
			[
				METHOD_NAME,
				PARAMETERS
			]
		*/
		let result
		let status = 200
		if (body && this[body[0]]) {
			try {
				result = await this[body[0]](this.state.storage, body[1])
			} catch (error) {
				result = error
				status = 500
			}
		} else {
			result = { found: false }
			status = 404
		}
		return new Response(JSON.stringify(result), {
			status,
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
