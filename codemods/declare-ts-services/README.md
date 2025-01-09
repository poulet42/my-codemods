## Example

This codemod transforms @service decorators to use the correct TypeScript syntax

### Before

```ts
@service myService;
```

### After

```ts
import { type Registry as Services } from '@ember/service';
...
@service declare myService: Services['myService'];
```
