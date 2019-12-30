import {Sex} from './sex.enum';
import {Family} from './family';
import {GedDate} from './ged-date';

export class Person {
  private static gen = 0;

  id = ++Person.gen;
  name: string;
  surname: string;
  birthsday = new GedDate();
  isAlive = true;
  death = new GedDate();
  sex: Sex = Sex.MALE;
  familyChild: Family;
  families: Family[] = [];
}
