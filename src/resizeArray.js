function resizeArray(array, size, defaultValue) {
	let delta = array.length - size;

	if (delta > 0) {
		array.length = size;
	} else {
		while (delta++ < 0) {
			array.push(defaultValue);
		}
	}

	return array;
}

module.exports = resizeArray;
