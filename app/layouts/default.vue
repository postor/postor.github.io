<template>
  <div>
    <nav>
      <NuxtLink to="/">Home</NuxtLink> 
    </nav>
    <slot />
  </div>
</template>

<style>
nav {
  padding: 1rem;
  text-align: center;
}

nav a {
  color: #42b883;
  text-decoration: none;
  margin: 0 0.5rem;
}

nav a.router-link-active {
  color: #35495e;
  font-weight: bold;
}
</style>