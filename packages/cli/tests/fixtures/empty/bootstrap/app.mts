import { Application } from 'rdx';

export default async function () {
  return new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
  });
}
