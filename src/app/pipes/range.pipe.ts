import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'range'
})
export class RangePipe implements PipeTransform {

  transform(value: number[], ...args: any[]): number[] {
    const min = value[0];
    const max = value[1];
    return Array(max - min + 1).map((_, i) => i + min);
  }

}
