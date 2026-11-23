export interface Unit {
  id: string;
  name: string;
  code?: string;
  lifecycleStatus?: 'ACTIVE' | 'INACTIVE' | 'QUARANTINED' | null;
  classification?: string;
  location?: string | null;
  plants?: Plant[];
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    plants: number;
  };
}

export interface CreateUnitRequest {
  name: string;
  code?: string;
  location?: string;
}

export interface UpdateUnitRequest {
  name?: string;
  code?: string;
  location?: string;
}

export interface Plant {
  id: string;
  name: string;
  code: string;
  unitId: string;
  unit?: Unit;
  buildings?: Building[];
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    buildings: number;
  };
}

export interface CreatePlantRequest {
  name: string;
  code: string;
  unitId: string;
}

export interface UpdatePlantRequest {
  name?: string;
  code?: string;
  unitId?: string;
}

export interface Office {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  createdAt: string;
  _count?: {
    buildings: number;
  };
}

export interface CreateOfficeRequest {
  name: string;
  city: string;
  address?: string;
}

export interface UpdateOfficeRequest {
  name?: string;
  city?: string;
  address?: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  plantId?: string;
  plant?: Plant;
  officeId?: string;
  office?: Office;
  floors?: Floor[];
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    floors: number;
  };
}

export interface CreateBuildingRequest {
  name: string;
  code: string;
  plantId?: string;
  officeId?: string;
}

export interface UpdateBuildingRequest {
  name?: string;
  code?: string;
  plantId?: string;
}

export interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  buildingId: string;
  imageUrl?: string | null;
  canvasWidth: number;
  canvasHeight: number;
  building?: Building;
  _count?: {
    seats: number;
  };
}

export interface CreateFloorRequest {
  name: string;
  floorNumber: number;
  buildingId: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface UpdateFloorRequest {
  name?: string;
  floorNumber?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  colorHex: string;
  _count?: {
    employees: number;
  };
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  colorHex: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  colorHex?: string;
}
