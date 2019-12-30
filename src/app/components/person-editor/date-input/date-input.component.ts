import {Component, Input, OnInit} from '@angular/core';
import {GedDate} from '../../../model/ged-date';

@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.css']
})
export class DateInputComponent implements OnInit {
  @Input() date: GedDate;
  day: number = null;
  month = -1;
  year: number = null;
  validYear = true;
  validMonth = true;
  validDate = true;

  readonly MONTH_MAPPER = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль',
    'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  constructor() {
  }

  ngOnInit() {
    const date = this.date.lt || this.date.gt || this.date.lte || this.date.gte;
    if (date) {
      this.day = date.getDate();
      this.month = date.getMonth();
      this.year = date.getFullYear();
    }
  }

  onChange() {
    const year = this.year > 0 ? this.year : null;
    const month = this.month >= 0 && this.month <= 11 ? this.month : null;
    const day = this.day > 0 && this.day < 32 ? this.day : null;
    if ((day !== null || month !== null) && year === null ||
      day !== null && month === null && year !== null) {
      this.validYear = year !== null;
      this.validMonth = month !== null;
      this.validDate = day !== null;
      return;
    }
    this.validDate = true;
    this.validMonth = true;
    this.validYear = true;
    if (day !== null) {
      if (new Date(year, month, day).getDate() !== day) {
        this.validDate = false;
        return;
      }
    }
    if (year !== null) {
      this.date.lte = new Date(year, month !== null ? month : 0, day !== null ? day : 1);
      this.date.gte = this.date.lte;
      this.date.lt = null;
      this.date.gt = null;
    } else {
      this.date.lte = null;
      this.date.gte = null;
      this.date.lt = null;
      this.date.gt = null;
    }
  }
}
