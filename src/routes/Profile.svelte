<script>
	import Navbar from '../components/Navbar.svelte'
	export let message
	export let user
	export let sessions
	let password
</script>

<Navbar />

<h2>Profile for <code>{user.username}</code></h2>

{#if message}
	<p style="border: 1px solid #555; padding: 1em; margin: 1em;">{message}</p>
{/if}

<p>This is your profile page, you can't see this for anyone else, just yourself.</p>

<p>You can log out by <a href="/logout">clicking here</a>.</p>

<form action="/profile" method="POST">
	<p>You can also update your password here.</p>
	<p>
		<label for="password">Password</label>
		<input type="text" id="password" name="password" bind:value={password}>
	</p>
	<p>
		<button type="submit">Reset Password</button>
	</p>
</form>

{#if sessions}
	<h2>Sessions {typeof sessions}</h2>
	<ul>
	{#each Object.keys(sessions) as sessionId}
		<li>
			{sessions[sessionId].id}
		</li>
	{/each}
	</ul>
{/if}
