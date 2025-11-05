<template>
  <div>
    <nav>
      <div class="nav-left">
        <NuxtLink to="/">Home</NuxtLink>
      </div>
      <div class="nav-right">
        <I18nSelect />
      </div>
    </nav>
    <slot />
  </div>
</template>

<style>
nav {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
}

.nav-right {
  display: flex;
  align-items: center;
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

/* small screens: move items to stack */
@media (max-width: 480px) {
  nav {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
  .nav-right {
    justify-content: center;
  }
}
</style>