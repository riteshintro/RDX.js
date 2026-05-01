import { Application } from 'avox';

export default async function () {
  return new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
  });
}
