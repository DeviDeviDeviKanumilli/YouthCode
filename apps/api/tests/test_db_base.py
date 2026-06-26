import uuid
from datetime import datetime

from sqlalchemy.orm import Mapped

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ExampleModel(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "example_models"


def test_metadata_uses_stable_constraint_naming() -> None:
    assert Base.metadata.naming_convention["pk"] == "pk_%(table_name)s"
    assert Base.metadata.naming_convention["fk"] == (
        "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
    )


def test_base_mixins_define_expected_columns() -> None:
    columns = ExampleModel.__table__.columns

    assert columns["id"].primary_key
    assert columns["created_at"].nullable is False
    assert columns["updated_at"].nullable is False
    assert columns["deleted_at"].nullable is True


def test_base_mixin_type_annotations_are_domain_friendly() -> None:
    id_annotation = UUIDPrimaryKeyMixin.__annotations__["id"]
    created_at_annotation = TimestampMixin.__annotations__["created_at"]

    assert id_annotation == Mapped[uuid.UUID]
    assert created_at_annotation == Mapped[datetime]
