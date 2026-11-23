export interface TransferDestinationFloor {
  id: string;
  name: string;
  floorNumber: number;
  buildingId: string;
  _count?: { seats?: number };
}

export interface TransferDestinationBuilding {
  id: string;
  name: string;
  code: string;
  plantId?: string | null;
  unitId?: string | null;
}

export interface TransferDestinationPlant {
  id: string;
  unitId: string;
}

/**
 * Modern hierarchy records belong directly to a Unit while legacy records
 * inherit their Unit through Plant. Both forms are valid transfer destinations.
 */
export const getTransferDestinationBuildings = (
  buildings: TransferDestinationBuilding[],
  plants: TransferDestinationPlant[],
  targetUnitId: string,
): TransferDestinationBuilding[] => buildings
  .filter((building) => building.unitId === targetUnitId
    || plants.some((plant) => plant.id === building.plantId && plant.unitId === targetUnitId))
  .sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code));

/**
 * The transfer approval picker can only allocate an existing workstation.
 * Keep empty legacy floor records out of the picker, while retaining floors
 * when an older API response does not include the seat count.
 */
export const getTransferDestinationFloors = (
  floors: TransferDestinationFloor[],
  buildingId: string,
): TransferDestinationFloor[] => floors
  .filter((floor) => floor.buildingId === buildingId)
  .filter((floor) => floor._count?.seats === undefined || floor._count.seats > 0)
  .sort((left, right) => left.floorNumber - right.floorNumber || left.name.localeCompare(right.name));
