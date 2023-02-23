import { Durable } from './_base.js'

export class User extends Durable {
	async getProfile(storage) { return storage.get('profile') }
	async putProfile(storage, { username, password }) { return storage.put('profile', { username, password })}
	async delProfile(storage) { return storage.delete('profile') }
	async getSession(storage, { id }) { return storage.get(`session|${id}`) }
	async putSession(storage, { id, secret, expired }) {
		await storage.put(`session|${id}`, {
			id,
			secret,
			expired,
		})
		return { id, secret, expired }
	}
	async delSession(storage, { id }) { return storage.delete(`session|${id}`) }
	async listSessions(storage, opts) {
		const params = { prefix: 'session|' }
		if (opts?.limit) params.limit = opts.limit
		if (opts?.start) params.start = opts.start
		if (opts?.reverse) params.reverse = opts.reverse
		return storage
			.list(params)
			.then(map => Object.fromEntries(map))
	}
}
