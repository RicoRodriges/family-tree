import {Person} from './person';

export class Family {
  private static gen = 0;

  id = ++Family.gen;
  wife: Person;
  husband: Person;
  children: Person[] = [];
  married = false;
}
