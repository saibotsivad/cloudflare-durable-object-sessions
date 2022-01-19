<script>
	import Navbar from '../components/Navbar.svelte'
	let username = ''
	let password = ''
</script>

<Navbar />

<form action="/login" method="POST">
	<h1>Log In</h1>
	<p>If you do not have an account, go <a href="/new_account">here</a> to create one.</p>
	<p>
		<label for="username">Username</label>
		<input type="text" id="username" name="username" bind:value={username}>
	</p>
	<p>
		<label for="password">Password</label>
		<input type="text" id="password" name="password" bind:value={password}>
	</p>
	<p>
		<button type="submit">Log In</button>
	</p>
</form>
