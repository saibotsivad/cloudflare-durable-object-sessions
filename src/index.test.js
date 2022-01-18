import { test } from 'uvu'
import * as assert from 'uvu/assert'
import TODO from './index.js'

test('TODO', () => {
	assert.type(TODO, 'function')
})

test.run()
