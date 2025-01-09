## Example

This codemod adds an empty component TS signature to glimmer components

### Before

```ts
export default class MyButtonComponent extends Component {
 ...
}
```

### After

```ts

interface MyButtonSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class MyButtonComponent extends Component<MyButtonSignature> {
 ...
}
```
