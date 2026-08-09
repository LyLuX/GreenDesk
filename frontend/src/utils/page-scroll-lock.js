const activeLocks = new Set();

/** Locks page scrolling until the returned release function is called. */
export const lockPageScroll = () => {
  const lock = Symbol('page-scroll-lock');
  activeLocks.add(lock);
  document.body.classList.add('app-scroll-locked');

  return () => {
    activeLocks.delete(lock);
    if (activeLocks.size === 0) document.body.classList.remove('app-scroll-locked');
  };
};
