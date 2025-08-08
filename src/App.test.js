import { render } from '@testing-library/react';
import App from './App';

test('app renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});

## Current Status
- ✅ Tests are running correctly
- ❌ 1 test suite failed (App.test.js)
- ⚠️ "0 total" tests means the test crashed before it could run

## Quick Fix

Let's update the <mcfile name="App.test.js" path="/Users/mahama/Dropbox/trae_course_creator/course_maker_app/src/App.test.js"></mcfile> file to work with your actual app:
```javascript
import { render } from '@testing-library/react';
import App from './App';

test('app renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});
```
