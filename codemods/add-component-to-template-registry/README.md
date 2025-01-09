## Example

This codemod adds a glint registry declaration in component files if it's not present already.

### Before

```ts
export default class MyComponent extends Component {
    ...
}
```

### After

```ts
export default class MyComponent extends Component {
    ...
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Path::To::MyComponent': typeof MyComponent;
  }
}
```
