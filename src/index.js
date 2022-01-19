import App from './routes/App.svelte'
import Login from './routes/Login.svelte'
import LoggedOut from './routes/LoggedOut.svelte'
import NewAccount from './routes/NewAccount.svelte'
import Profile from './routes/Profile.svelte'
import * as Cookie from 'worktop/cookie'
import * as Base64 from 'worktop/base64'
import { ulid, uid } from 'worktop/utils'
import Trouter from 'trouter'

export { User } from './objects/user.js'

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

export default {
	async fetch(request, env) {
		try {
			return await handleRequest(request, env)
		} catch (e) {
			return new Response(e.message)
		}
	},
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

const makeDurableFetch = (url, durableClass) => async (id, command, action, params) => {
	const durable = durableClass.get(durableClass.idFromName(id))
	const response = await durable.fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify([ command, action, params ]),
	})
	try {
		return (await response.json()).data
	} catch (error) {
		console.log('error parsing json response', { id, command, action, params })
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
		const loginUser = await durableFetch(form.username, 'profile', 'get', undefined)
		// TODO use hash instead
		if (loginUser && loginUser.password === form.password) {
			const session = await durableFetch(form.username, 'session', 'put', {
				id: ulid(),
				secret: uid(32),
			})
			return session?.id
				? new Response('Redirecting...', {
					status: 303,
					headers: {
						'Set-Cookie': stringifyCookie({ id: session.id, secret: session.secret, username: form.username }),
						Location: `${url.origin}/profile`,
					},
				})
				: Response.redirect(`${url.origin}/login?message=${encodeURIComponent('Error while saving session.')}`)
		}
		return Response.redirect(`${url.origin}/login?message=${encodeURIComponent('Bad username or password. ')}`)
	})
	.get('/profile', async ({ url, durableFetch, user }) => {
		return user
			? htmlResponse(200, Profile.render({ user, sessions: await durableFetch(user.username, 'sessions', 'list') }))
			: Response.redirect(`${url.origin}/login`)
	})
	.post('/profile', async ({ url, durableFetch, user, form }) => {
		if (!user) return Response.redirect(`${url.origin}/login`)
		if (!form?.password) return Response.redirect(`${url.origin}/profile?message=${encodeURIComponent('No password provided.')}`)
		user.password = form.password // TODO hash+salt before saving
		await durableFetch(user.username, 'profile', 'put', user)
		return Response.redirect(`${url.origin}/profile?message=${encodeURIComponent('Password has been changed.')}`)
	})
	.get('/new_account', async ({ url, user }) => {
		if (user) return Response.redirect(`${url.origin}/profile`)
		return htmlResponse(200, NewAccount.render())
	})
	.post('/new_account', async ({ form, url, durableFetch }) => {
		if (!form.username || !form.password) return Response.redirect(`${url.origin}/new_account?message=${encodeURIComponent('No username/password specified.')}`)
		const existingUser = await durableFetch(form.username, 'profile', 'get')
		if (existingUser) return Response.redirect(`${url.origin}/new_account?message=${encodeURIComponent('Username is already taken.')}`)
		await durableFetch(form.username, 'profile', 'put', {
			username: form.username,
			password: form.password, // TODO hash+salt before saving
		})
		return Response.redirect(`${url.origin}/login?message=${encodeURIComponent('User created, go ahead and log in.')}`)
	})
	.get('/logout', async ({ user, session, durableFetch }) => {
		if (user && session) await durableFetch(user.username, 'session', 'put', {
			id: session.id,
			expired: Date.now(),
		})
		return htmlResponse(200, LoggedOut.render(), { 'Set-Cookie': stringifyCookie({}) })
	})

async function handleRequest(request, env) {
	const url = new URL(request.url)
	const cookie = parseCookie(request)

	const durableFetch = makeDurableFetch(url.origin + '/DO', env.USER)

	let user
	let session
	if (cookie && cookie.id && cookie.username && cookie.secret) {
		session = await durableFetch(cookie.username, 'session', 'get', { id: cookie.id })
		if (session && session.secret && session.secret === cookie.secret) {
			user = await durableFetch(cookie.username, 'profile', 'get')
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
		})
	} else {
		return new Response('Not found', { status: 404 })
	}
}
