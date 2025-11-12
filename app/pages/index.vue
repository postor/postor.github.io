<template>
	<main class="home-links">
		<h1>Welcome</h1>
		<ul>
			<li><NuxtLink to="/book-reading/">📚 Book Reading</NuxtLink></li>
			<li><NuxtLink to="/learn-game/">🎮 Learn Game</NuxtLink></li>
		</ul>
	</main>
</template>

<style scoped>
.home-links {
	max-width: 640px;
	margin: 2rem auto;
	padding: 0 1rem;
}
.home-links h1 {
	font-size: 1.75rem;
	margin-bottom: 1rem;
}
.home-links ul {
	list-style: none;
	padding: 0;
	margin: 0;
}
.home-links li {
	margin: 0.75rem 0;
}
.home-links a {
	display: inline-block;
	padding: 0.5rem 0.75rem;
	border-radius: 6px;
	text-decoration: none;
	background: var(--c-bg-soft, #f5f5f7);
	color: var(--c-text, #222);
	transition: background 0.15s ease, color 0.15s ease;
}
.home-links a:hover {
	background: var(--c-bg-hover, #e0e0e2);
	color: var(--c-text-strong, #111);
}
</style>