import App from './routes/App.svelte'
import Login from './routes/Login.svelte'
import LoggedOut from './routes/LoggedOut.svelte'
import NewAccount from './routes/NewAccount.svelte'
import Profile from './routes/Profile.svelte'
import * as Cookie from 'worktop/cookie'
import * as Base64 from 'worktop/base64'
import { ulid, uid } from 'worktop/utils'
import Trouter from 'trouter'

const html = ({ head, html, css }) => `<!DOCTYPE html>
<head lang="en-US">
	<meta name="viewport" content="width=device-width" />
	<meta charset="UTF-8" />
	<style>
		body { background-color: #e2e2e2; }
		${css.code}
	</style>
	<title>CF DO Sessions Demo</title>
	${head}
</head>
<body>
${html}
</body>`

const htmlResponse = (status, component, headers = {}) => new Response(
	html(component),
	{
		status,
		headers: {
			'Content-Type': 'text/html;charset=UTF-8',
			...headers,
		},
	},
)

const readForm = async request => {
	const formData = await request.formData()
	const body = {}
	for (const entry of formData.entries()) {
		body[entry[0]] = entry[1]
	}
	return body
}

const parseCookie = request => {
	try {
		return JSON.parse(
			Base64.decode(
				Cookie.parse(request.headers.get('cookie') || '').SESSION,
			),
		)
	} catch (ignore) {
		//
	}
	return null
}

const stringifyCookie = params => Cookie.stringify(
	'SESSION',
	Base64.encode(
		JSON.stringify(params),
	),
	// TODO httpOnly etc
)

const makeDurableFetch = (url, durableClass) => async (id, command, params) => {
	const durable = durableClass.get(durableClass.idFromName(id))
	const response = await durable.fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify([ command, params ]),
	})
	try {
		return (await response.json()).data
	} catch (error) {
		console.log('error parsing json response', { id, command, params })
		throw error
	}
}

const router = new Trouter()

router
	.get('/', async () => htmlResponse(200, App.render()))
	.get('/login', async ({ url, user, session }) => {
		if (user && session) return Response.redirect(`${url.origin}/profile`)
		return htmlResponse(200, Login.render())
	})
	.post('/login', async ({ url, form, durableFetch }) => {
		if (!form.username || !form.password) return Response.redirect(`${url.origin}/login?message=${encodeURIComponent('No username/password specified.')}`)
		const loginUser = await durableFetch(form.username, 'getProfile', undefined)
		// TODO use hash instead
		if (loginUser && loginUser.password === form.password) {
			const session = await durableFetch(form.username, 'putSession', {
				id: ulid(),
				secret: uid(32),
			})
			return session?.id
				? new Response('Redirecting...', {
					status: 303,
					headers: {
						'Set-Cookie': stringifyCookie({
							id: session.id,
							secret: session.secret,
							username: form.username,
						}),
						Location: `${url.origin}/profile`,
					},
				})
				: Response.redirect(`${url.origin}/login?message=${encodeURIComponent('Error while saving session.')}`)
		}
		return Response.redirect(`${url.origin}/login?message=${encodeURIComponent('Bad username or password. ')}`)
	})
	.get('/profile', async ({ url, durableFetch, user, session }) => {
		return user
			? htmlResponse(200, Profile.render({
				user,
				session,
				sessions: await durableFetch(user.username, 'listSessions'),
			}))
			: Response.redirect(`${url.origin}/login`)
	})
	.post('/profile', async ({ url, durableFetch, user, form }) => {
		if (!user) return Response.redirect(`${url.origin}/login`)
		if (!form?.password) return Response.redirect(`${url.origin}/profile?message=${encodeURIComponent('No password provided.')}`)
		user.password = form.password // TODO hash+salt before saving
		await durableFetch(user.username, 'putProfile', user)
		return Response.redirect(`${url.origin}/profile?message=${encodeURIComponent('Password has been changed.')}`)
	})
	.get('/new_account', async ({ url, user }) => {
		if (user) return Response.redirect(`${url.origin}/profile`)
		return htmlResponse(200, NewAccount.render())
	})
	.post('/new_account', async ({ form, url, durableFetch }) => {
		if (!form.username || !form.password) return Response.redirect(`${url.origin}/new_account?message=${encodeURIComponent('No username/password specified.')}`)
		const existingUser = await durableFetch(form.username, 'getProfile')
		if (existingUser) return Response.redirect(`${url.origin}/new_account?message=${encodeURIComponent('Username is already taken.')}`)
		await durableFetch(form.username, 'putProfile', {
			username: form.username,
			password: form.password, // TODO hash+salt before saving
		})
		return Response.redirect(`${url.origin}/login?message=${encodeURIComponent('User created, go ahead and log in.')}`)
	})
	.get('/logout', async ({ user, session, durableFetch }) => {
		if (user && session) await durableFetch(user.username, 'putSession', {
			id: session.id,
			expired: Date.now(),
		})
		return htmlResponse(200, LoggedOut.render(), { 'Set-Cookie': stringifyCookie({}) })
	})
	.get('/session/remove/:sessionId', async ({ url, user, durableFetch, sessionId }) => {
		if (user) await durableFetch(user.username, 'delSession', { id: sessionId })
		return Response.redirect(`${url.origin}/profile?message=${encodeURIComponent('Deleted session: ' + sessionId)}`)
	})

async function handleRequest(request, env) {
	const url = new URL(request.url)
	const cookie = parseCookie(request)

	// The `env.USER` is how you bind an exported class name, in this case
	// the `export { User }` to a Worker instantiation environment. Look at
	// the `wrangler.toml` file for more details to see how `User` maps to `USER`.
	const durableFetch = makeDurableFetch(url.origin + '/DO', env.USER)

	/*
	This `durableFetch` is wrapping up this boilerplate:

	// This is how you instantiate a Durable Object:
	const username = '' // from a form, session cookie, auth token, etc.
	const durableId = env.USER.idFromName(username)
	const durableInstance = env.USER.get(durableId)

	// To interact with it, you use `instance.fetch` which behaves the
	// same as the `globalThis.fetch`. The `url` doesn't actually matter,
	// but if you are using a path router in the Durable Object (I'm not
	// in this demo) you'll of course need to set it here.
	//
	// Note that the URL used here will show up in the Worker logs, so
	// make sure to be careful with privacy concerns.
	const response = durableInstance.fetch(url.origin + '/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify([ command, action, params ]),
	})

	// The `response` is a normal `fetch` response, so you can just
	// grab the JSON, if that's what came back:
	const data = await response.json()

	 */

	let user
	let session
	if (cookie && cookie.id && cookie.username && cookie.secret) {
		session = await durableFetch(cookie.username, 'getSession', { id: cookie.id })
		if (session && session.secret && session.secret === cookie.secret) {
			user = await durableFetch(cookie.username, 'getProfile')
		}
	}

	const form = request.method === 'POST'
		&& request.headers.get('content-type')?.includes('form')
		&& await readForm(request)

	const route = router.find(request.method, url.pathname)
	if (route.handlers.length) {
		return route.handlers[0]({
			url,
			user,
			session,
			form,
			durableFetch,
			...route.params,
		})
	} else {
		return new Response('Not found', { status: 404 })
	}
}

export default {
	async fetch(request, env) {
		try {
			return await handleRequest(request, env)
		} catch (e) {
			return new Response(e.message)
		}
	},
}

export { User } from './objects/user.js'
