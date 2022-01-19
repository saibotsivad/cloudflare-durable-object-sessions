<script>
	import Navbar from '../components/Navbar.svelte'
	let username = ''
	let password = ''
</script>

<Navbar />

<form action="/new_account" method="POST">
	<h1>Create a New Account</h1>
	<p>If you have an account, go <a href="/">here</a> to log in.</p>
	<p>
		<label for="username">Username</label>
		<input type="text" id="username" name="username" bind:value={username}>
	</p>
	<p>
		<label for="password">Password</label>
		<input type="text" id="password" name="password" bind:value={password}>
	</p>
	<p>
		<button type="submit">Create Account</button>
	</p>
</form>
