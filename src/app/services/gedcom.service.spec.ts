import { TestBed } from '@angular/core/testing';

import { GedcomService } from './gedcom.service';

describe('GedcomService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GedcomService = TestBed.get(GedcomService);
    expect(service).toBeTruthy();
  });
});
