import { useMemo } from 'react'
import type { LocalMap } from '../../../gameTypes'
import { LocalMapReadout } from './LocalMapReadout'
import { LocalMapView } from './LocalMapView'
import { getLiveLocalMapContact } from './mapMath'
import { navigationContent } from '../styleClasses'

export function LocalMapPanel({
  elapsedMilliseconds,
  map,
  onSelectContact,
  selectedContactId,
}: {
  elapsedMilliseconds: number
  map: LocalMap
  onSelectContact: (contactId: string) => void
  selectedContactId: string | null
}) {
  const contacts = useMemo(
    () =>
      map.contacts.map((contact) =>
        getLiveLocalMapContact(contact, elapsedMilliseconds),
      ),
    [elapsedMilliseconds, map.contacts],
  )
  const selectedContact =
    contacts.find((contact) => contact.contact.id === selectedContactId) ??
    null

  return (
    <div className={navigationContent}>
      <LocalMapView
        contacts={contacts}
        map={map}
        onSelectContact={onSelectContact}
        selectedContactId={selectedContactId}
      />
      <LocalMapReadout
        elapsedMilliseconds={elapsedMilliseconds}
        map={map}
        selectedContact={selectedContact}
      />
    </div>
  )
}
