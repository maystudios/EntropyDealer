const Utils = (() => {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomFloat() {
    return Math.random();
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function sample(array) {
    if (!array.length) return undefined;
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  return {
    clamp,
    randomFloat,
    randomInt,
    shuffle,
    sample,
  };
})();
