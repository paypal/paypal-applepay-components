PayPal JS SDK Legal Messaging Component
----------------------------------

[![build status][build-badge]][build]
[![code coverage][coverage-badge]][coverage]
[![npm version][version-badge]][package]
[![apache license][license-badge]][license]

[build-badge]: https://img.shields.io/github/workflow/status/paypal/paypal-legal-components/build?logo=github&style=flat-square
[build]: https://github.com/paypal/paypal-legal-components/actions?query=workflow%3Abuild
[coverage-badge]: https://img.shields.io/codecov/c/github/paypal/paypal-legal-components.svg?style=flat-square
[coverage]: https://codecov.io/github/paypal/paypal-legal-components/
[version-badge]: https://img.shields.io/npm/v/@paypal/legal-components.svg?style=flat-square
[package]: https://www.npmjs.com/package/@paypal/legal-components
[license-badge]: https://img.shields.io/npm/l/@paypal/legal-components.svg?style=flat-square
[license]: https://github.com/paypal/paypal-legal-components/blob/main/LICENSE

PayPal JS SDK Legal Component to Display Legal Messages for various Payment Methods
### Quick start

See [src/index.js](./src/index.js)

#### Tests

- Run the tests:

  ```bash
  npm test
  ```

#### Testing with different/multiple browsers

```bash
npm run karma -- --browser=Chrome
npm run karma -- --browser=Safari
npm run karma -- --browser=Firefox
npm run karma -- --browser=Chrome,Safari,Firefox
```

#### Keeping the browser open after tests

```bash
npm run karma -- --browser=Chrome --keep-open
```

#### Releasing and Publishing

- Publish your code with a patch version:

```bash
npm run release
```

- Or `npm run release:patch`, `npm run release:minor`, `npm run release:major`

### Integration

```html

<script src="https://www.paypal.com/sdk/js?client-id=test&components=legal"></script>

<!-- Place the container div right above the final Checkout Button -->
<div id="paypal-legal-container"></div>

<script>
paypal.Legal({
        fundingSource: paypal.Legal.FUNDING.PAY_UPON_INVOICE
        })
      .render("#paypal-legal-container");
</script>

```

### Hosted Example

See the hosted example [here](https://pui-legal-app.herokuapp.com/)

<img width="1000" alt="image" src="https://user-images.githubusercontent.com/9788837/162337448-79b1d6c8-6766-41d6-920f-f5400b777e02.png">
