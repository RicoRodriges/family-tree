import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {SvgTreeComponent} from './components/svg-tree/svg-tree.component';
import {RangePipe} from './pipes/range.pipe';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import {NgbDatepickerModule, NgbDropdownModule, NgbModalModule} from '@ng-bootstrap/ng-bootstrap';
import { PersonEditorComponent } from './components/person-editor/person-editor.component';
import { PersonListComponent } from './components/person-list/person-list.component';
import {FormsModule} from '@angular/forms';
import { DateInputComponent } from './components/person-editor/date-input/date-input.component';
import { TreeButtonComponent } from './components/tree-button/tree-button.component';
import { WindButtonComponent } from './components/wind-button/wind-button.component';
import { ScrollTopComponent } from './components/scroll-top/scroll-top.component';

@NgModule({
  declarations: [
    AppComponent,
    SvgTreeComponent,
    RangePipe,
    NavBarComponent,
    PersonEditorComponent,
    PersonListComponent,
    DateInputComponent,
    TreeButtonComponent,
    WindButtonComponent,
    ScrollTopComponent
  ],
  imports: [
    BrowserModule,
    NgbModalModule,
    // NgbDatepickerModule,
    FormsModule,
    NgbDropdownModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
